// "1 point" but "2 points", "0 points" and "-1 point". A pure helper, so client and server
// components can import it.
export function pointUnit(amount: number): "point" | "points" {
  return Math.abs(amount) === 1 ? "point" : "points";
}
