import Link from "next/link";

export default function RotatingTextCircle({
  text = "• BOOK NOW • BOOK NOW • BOOK NOW •",
  fontSize = 23,
  fontFamily = "var(--font-el-messiri)",
  strokeColor = "#ffffff",
  strokeWidth = 0.6,
  animationDuration = 18,
  className = "",
  centerIcon = "→",
}) {
  return (
    <div className={className}>
      <div
        className="relative w-[120px] h-[120px]"
        style={{
          animation: `spin ${animationDuration}s linear infinite`,
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <path
              id="circlePath"
              d="M100,100 m-85,0 a85,85 0 1,1 170,0 a85,85 0 1,1 -170,0"
            />
          </defs>

          <text
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fontSize={fontSize}
            fontFamily={fontFamily}
            letterSpacing="1"
            paintOrder="stroke"
            style={{
              fontWeight: 400,
              opacity: 0.9,
              textTransform: "uppercase",
            }}
          >
            <textPath href="#circlePath" startOffset="0%">
              {text}
            </textPath>
          </text>
        </svg>
      </div>

      {/* Center icon */}
      <Link href="/reserve-table" aria-label="Book a Table">
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-3xl text-white animate-pulse">
            {centerIcon}
          </div>
        </div>
      </Link>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}