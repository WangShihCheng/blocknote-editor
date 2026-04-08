import { useState, useEffect, useRef } from "react";

export function NumberTicker({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [animKey, setAnimKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setDisplay(value);
      setAnimKey(k => k + 1);
    }
  }, [value]);
  return <span key={animKey} className="number-ticker">{display.toLocaleString()}</span>;
}
