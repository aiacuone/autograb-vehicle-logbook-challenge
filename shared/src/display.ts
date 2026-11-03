/** How each make is shown on the page. The data file keeps its own lower-case keys as supplied. */
export const makeDisplayNames: Readonly<Record<string, string>> = {
  ford: 'Ford',
  bmw: 'BMW',
  tesla: 'Tesla',
};

/** The make's display name, or the make itself when the map has no entry for it. */
export function makeDisplayName(make: string): string {
  return Object.hasOwn(makeDisplayNames, make)
    ? (makeDisplayNames[make] as string)
    : make;
}

export interface Vehicle {
  make: string;
  model: string;
  badge: string;
}

/** The quick-select buttons. A server test checks that each one exists in the vehicle data. */
export const quickSelectVehicles: readonly Vehicle[] = [
  { make: 'ford', model: 'Ranger', badge: 'Raptor' },
  { make: 'tesla', model: 'Model 3', badge: 'Long Range' },
];

/** A vehicle as one readable line, for example "Ford Ranger Raptor". */
export function vehicleLabel({ make, model, badge }: Vehicle): string {
  return `${makeDisplayName(make)} ${model} ${badge}`;
}
