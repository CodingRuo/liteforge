interface Props {
  name: string
  count: number
}

export function Typed(props: Props) {
  const handle = (e: Event) => { e.preventDefault() }
  return (
    <div class="typed" onclick={handle}>
      {props.name}: {() => props.count}
    </div>
  )
}
