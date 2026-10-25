// The letters in a student's avatar when there is no picture: the first letter of the
// first two words of the name, "Helper Student Example" gives "HS". A student without a
// name yet gets "S". A pure helper, so client and server components can import it, and
// every avatar shows the same student the same way.
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    // Array.from takes a whole character, also one outside the basic plane.
    .map((word) => Array.from(word)[0].toUpperCase())
    .join("");
  return letters || "S";
}
