let _popped = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => { _popped = true; });
}

export function consumePopFlag(): boolean {
  const was = _popped;
  _popped = false;
  return was;
}
