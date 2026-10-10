export default function PitaBatik({
  tinggi = 32,
  className = "",
}: {
  tinggi?: number;
  className?: string;
}) {
  const dasar = {
    backgroundRepeat: "repeat-x",
    backgroundSize: "auto 100%",
  } as const;

  return (
    <div aria-hidden="true" className={`flex w-full ${className}`} style={{ height: tinggi }}>
      <div
        className="w-1/2"
        style={{ ...dasar, backgroundColor: "#0B6FB8", backgroundImage: "url(/brand/batik-biru.jpg)" }}
      />
      <div
        className="w-1/2"
        style={{ ...dasar, backgroundColor: "#007A52", backgroundImage: "url(/brand/batik-hijau.jpg)" }}
      />
    </div>
  );
}