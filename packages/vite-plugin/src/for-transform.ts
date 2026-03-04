/**
 * LiteForge Control Flow Transform
 *
 * Transforms developer-facing control flow calls into the runtime's getter-based API.
 * Runs BEFORE the JSX transform so it operates on raw JSX nodes.
 *
 * For():
 *   each: items()     → each: () => items()        (wrap dynamic value in getter)
 *   {item.name}       → {() => item().name}        (rewrite item property accesses)
 *   class={item.x}    → class={() => item().x}     (rewrite attribute values)
 *
 * Show() / Switch() / Match():
 *   when: expr        → when: () => expr           (wrap dynamic condition in getter)
 *
 * After this runs, JSX transform sees pre-transformed expressions and handles them normally.
 */

import type { Visitor, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { shouldWrapExpression, wrapInGetter } from './getter-wrap.js';

// =============================================================================
// Public API
// =============================================================================

/** Names of control flow components whose `when` prop should be auto-wrapped. */
const WHEN_COMPONENTS = new Set(['Show', 'Switch', 'Match']);

/**
 * Create a Babel visitor that transforms control flow calls.
 * Must run BEFORE JSX transformation.
 */
export function createForTransformVisitor(): Visitor {
  return {
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee;
      if (!t.isIdentifier(callee)) return;

      const propsArg = path.node.arguments[0];
      if (!propsArg || !t.isObjectExpression(propsArg)) return;

      if (callee.name === 'For') {
        const eachProp = findProperty(propsArg, 'each');
        const childrenProp = findProperty(propsArg, 'children');
        if (eachProp) transformEach(eachProp);
        if (childrenProp) transformChildrenProp(childrenProp);
        return;
      }

      if (WHEN_COMPONENTS.has(callee.name)) {
        const whenProp = findProperty(propsArg, 'when');
        if (whenProp) transformWhen(whenProp);
      }
    },
  };
}

// =============================================================================
// when transform (Show / Switch / Match)
// =============================================================================

/**
 * Wrap `when` value in a getter if it's not already one.
 * Show({ when: expr }) → Show({ when: () => expr })
 */
function transformWhen(prop: t.ObjectProperty): void {
  const value = prop.value;
  if (!t.isExpression(value)) return;
  // Already a getter function — leave as-is
  if (t.isArrowFunctionExpression(value) || t.isFunctionExpression(value)) return;
  // Static literal — no getter needed
  if (!shouldWrapExpression(value)) return;
  prop.value = wrapInGetter(value);
}

// =============================================================================
// each transform
// =============================================================================

function transformEach(prop: t.ObjectProperty): void {
  const value = prop.value;
  if (!t.isExpression(value)) return;
  if (t.isArrowFunctionExpression(value) || t.isFunctionExpression(value)) return;
  if (!shouldWrapExpression(value)) return;
  prop.value = wrapInGetter(value);
}

// =============================================================================
// children transform
// =============================================================================

function transformChildrenProp(prop: t.ObjectProperty): void {
  const fn = prop.value;
  if (!t.isArrowFunctionExpression(fn) && !t.isFunctionExpression(fn)) return;
  if (fn.params.length === 0) return;

  const itemParam = fn.params[0];
  const indexParam = fn.params[1];
  if (!t.isIdentifier(itemParam)) return;

  const itemName = itemParam.name;
  const indexName = t.isIdentifier(indexParam) ? indexParam.name : null;

  // Skip if already getter-style (has item() call without member access)
  if (isAlreadyGetterStyle(fn.body, itemName)) return;

  // Rewrite all JSX expression containers and attribute values in the body
  rewriteBody(fn.body, itemName, indexName);
}

/**
 * Heuristic: if the body contains a no-arg call of the param (item()),
 * it's already in getter style — don't transform again.
 */
function isAlreadyGetterStyle(body: t.BlockStatement | t.Expression, paramName: string): boolean {
  let found = false;
  walkExpressions(body, (expr) => {
    if (
      t.isCallExpression(expr) &&
      t.isIdentifier(expr.callee) &&
      expr.callee.name === paramName &&
      expr.arguments.length === 0
    ) {
      found = true;
    }
  });
  return found;
}

// =============================================================================
// Body rewriting — operates on JSX nodes
// =============================================================================

/**
 * Walk the function body and rewrite all JSX expression containers
 * (both in children and attribute values) that reference item/index.
 */
function rewriteBody(
  body: t.BlockStatement | t.Expression,
  itemName: string,
  indexName: string | null,
): void {
  walkJsxNodes(body, itemName, indexName);
}

/**
 * Recursively walk JSX nodes and rewrite expression containers that
 * reference the item or index param.
 */
function walkJsxNodes(
  node: t.Node,
  itemName: string,
  indexName: string | null,
): void {
  if (t.isJSXElement(node)) {
    // Process all attributes
    for (const attr of node.openingElement.attributes) {
      if (!t.isJSXAttribute(attr)) continue;
      if (!t.isJSXExpressionContainer(attr.value)) continue;
      const expr = attr.value.expression;
      if (t.isJSXEmptyExpression(expr)) continue;

      // Skip event handlers and ref
      const attrName = t.isJSXIdentifier(attr.name) ? attr.name.name : '';
      if (isEventHandlerKey(attrName) || attrName === 'ref') continue;

      if (referencesParam(expr, itemName) || (indexName && referencesParam(expr, indexName))) {
        attr.value = t.jsxExpressionContainer(
          rewriteExprForParam(expr, itemName, indexName),
        );
      }
    }
    // Recurse into children
    for (const child of node.children) {
      if (t.isJSXExpressionContainer(child)) {
        const expr = child.expression;
        if (!t.isJSXEmptyExpression(expr)) {
          if (referencesParam(expr, itemName) || (indexName && referencesParam(expr, indexName))) {
            child.expression = rewriteExprForParam(expr, itemName, indexName);
          }
        }
      } else {
        walkJsxNodes(child, itemName, indexName);
      }
    }
    return;
  }

  if (t.isJSXFragment(node)) {
    for (const child of node.children) walkJsxNodes(child, itemName, indexName);
    return;
  }

  // Non-JSX: walk into arrow/function bodies (nested render functions)
  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
    walkJsxNodes(node.body, itemName, indexName);
    return;
  }

  if (t.isBlockStatement(node)) {
    for (const stmt of node.body) walkJsxNodes(stmt, itemName, indexName);
    return;
  }

  if (t.isReturnStatement(node) && node.argument) {
    walkJsxNodes(node.argument, itemName, indexName);
    return;
  }

  if (t.isExpressionStatement(node)) {
    walkJsxNodes(node.expression, itemName, indexName);
    return;
  }
}

// =============================================================================
// Expression rewriting
// =============================================================================

/**
 * Rewrite an expression that appears in a reactive JSX position.
 * Wraps in a getter and rewrites param references inside to param().
 */
function rewriteExprForParam(
  expr: t.Expression,
  itemName: string,
  indexName: string | null,
): t.Expression {
  // Already a getter — recurse into its body instead
  if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
    rewriteBody(expr.body, itemName, indexName);
    return expr;
  }

  // Rewrite the expression (param.x → param().x, param → param()) then wrap
  const rewritten = rewriteParamRefs(expr, itemName, indexName);
  return wrapInGetter(rewritten);
}

/**
 * Recursively rewrite all param identifier references to param() calls.
 * item.name → item().name
 * item      → item()
 * index     → index()
 */
function rewriteParamRefs(
  expr: t.Expression,
  itemName: string,
  indexName: string | null,
): t.Expression {
  // item → item()
  if (t.isIdentifier(expr) && expr.name === itemName) {
    return t.callExpression(t.identifier(itemName), []);
  }

  // index → index()
  if (indexName && t.isIdentifier(expr) && expr.name === indexName) {
    return t.callExpression(t.identifier(indexName), []);
  }

  // item.prop → item().prop (direct member access)
  if (t.isMemberExpression(expr) && t.isIdentifier(expr.object) && expr.object.name === itemName) {
    return t.memberExpression(
      t.callExpression(t.identifier(itemName), []),
      expr.property,
      expr.computed,
    );
  }

  // Deeper member: recurse into object
  if (t.isMemberExpression(expr)) {
    return t.memberExpression(
      rewriteParamRefs(expr.object, itemName, indexName),
      expr.property,
      expr.computed,
    );
  }

  // Call expression: item.method(args) → item().method(args)
  if (t.isCallExpression(expr)) {
    const newCallee = t.isExpression(expr.callee)
      ? rewriteParamRefs(expr.callee, itemName, indexName)
      : expr.callee;
    const newArgs = expr.arguments.map((arg) =>
      t.isExpression(arg) ? rewriteParamRefs(arg, itemName, indexName) : arg,
    );
    return t.callExpression(newCallee, newArgs);
  }

  // Binary: item.x + item.y
  if (t.isBinaryExpression(expr)) {
    const left = t.isExpression(expr.left)
      ? rewriteParamRefs(expr.left, itemName, indexName)
      : expr.left;
    const right = t.isExpression(expr.right)
      ? rewriteParamRefs(expr.right, itemName, indexName)
      : expr.right;
    return t.binaryExpression(expr.operator, left, right);
  }

  // Logical: item.x ?? fallback
  if (t.isLogicalExpression(expr)) {
    return t.logicalExpression(
      expr.operator,
      rewriteParamRefs(expr.left, itemName, indexName),
      rewriteParamRefs(expr.right, itemName, indexName),
    );
  }

  // Conditional: item.active ? 'a' : 'b'
  if (t.isConditionalExpression(expr)) {
    return t.conditionalExpression(
      rewriteParamRefs(expr.test, itemName, indexName),
      rewriteParamRefs(expr.consequent, itemName, indexName),
      rewriteParamRefs(expr.alternate, itemName, indexName),
    );
  }

  // Template literal: `${item.name}`
  if (t.isTemplateLiteral(expr)) {
    const newExpressions = expr.expressions.map((e) =>
      t.isExpression(e) ? rewriteParamRefs(e, itemName, indexName) : e,
    );
    return t.templateLiteral(expr.quasis, newExpressions);
  }

  // Unary: !item.active
  if (t.isUnaryExpression(expr)) {
    return t.unaryExpression(expr.operator, rewriteParamRefs(expr.argument, itemName, indexName));
  }

  return expr;
}

// =============================================================================
// AST Walkers
// =============================================================================

/**
 * Walk all expression nodes in a subtree.
 */
function walkExpressions(node: t.Node, visit: (expr: t.Expression) => void): void {
  if (t.isExpression(node)) visit(node);

  if (t.isCallExpression(node)) {
    if (t.isExpression(node.callee)) walkExpressions(node.callee, visit);
    for (const arg of node.arguments) {
      if (t.isExpression(arg)) walkExpressions(arg, visit);
    }
  } else if (t.isMemberExpression(node)) {
    walkExpressions(node.object, visit);
  } else if (t.isConditionalExpression(node)) {
    walkExpressions(node.test, visit);
    walkExpressions(node.consequent, visit);
    walkExpressions(node.alternate, visit);
  } else if (t.isBinaryExpression(node) || t.isLogicalExpression(node)) {
    walkExpressions(node.left, visit);
    walkExpressions(node.right, visit);
  } else if (t.isUnaryExpression(node)) {
    walkExpressions(node.argument, visit);
  } else if (t.isTemplateLiteral(node)) {
    for (const expr of node.expressions) {
      if (t.isExpression(expr)) walkExpressions(expr, visit);
    }
  } else if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
    walkExpressions(node.body, visit);
  } else if (t.isBlockStatement(node)) {
    for (const stmt of node.body) walkExpressions(stmt, visit);
  } else if (t.isReturnStatement(node) && node.argument) {
    walkExpressions(node.argument, visit);
  } else if (t.isExpressionStatement(node)) {
    walkExpressions(node.expression, visit);
  } else if (t.isJSXElement(node)) {
    for (const child of node.children) walkExpressions(child, visit);
    for (const attr of node.openingElement.attributes) walkExpressions(attr, visit);
  } else if (t.isJSXAttribute(node) && node.value) {
    walkExpressions(node.value, visit);
  } else if (t.isJSXExpressionContainer(node) && !t.isJSXEmptyExpression(node.expression)) {
    walkExpressions(node.expression, visit);
  }
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if an expression subtree contains a reference to the param name.
 */
function referencesParam(node: t.Node, paramName: string): boolean {
  let found = false;
  walkExpressions(node, (expr) => {
    if (t.isIdentifier(expr) && expr.name === paramName) found = true;
  });
  return found;
}

function findProperty(obj: t.ObjectExpression, key: string): t.ObjectProperty | null {
  for (const prop of obj.properties) {
    if (!t.isObjectProperty(prop)) continue;
    const k = t.isIdentifier(prop.key)
      ? prop.key.name
      : t.isStringLiteral(prop.key)
        ? prop.key.value
        : null;
    if (k === key) return prop;
  }
  return null;
}

function isEventHandlerKey(name: string): boolean {
  return /^on[A-Z]/.test(name) || /^on[a-z]/.test(name);
}
