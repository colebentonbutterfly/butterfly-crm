export default function LocationBadge({ location }: { location: string }) {
  const cls =
    location === "Pod 1" ? "badge-pod1" :
    location === "Pod 2" ? "badge-pod2" :
    location === "Shipping Container" ? "badge-container" :
    location === "Donated" ? "badge-donated" :
    "badge-trash";
  return <span className={cls}>{location}</span>;
}
