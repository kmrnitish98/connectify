/**
 * ConnectifyLogo.jsx
 * Reusable SVG logo component matching the brand logo image.
 * Two overlapping speech bubbles (green + blue-purple) with white dots.
 */
const ConnectifyLogo = ({ size = 32, className = '', showText = true }) => {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* SVG icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Green large bubble */}
        <ellipse cx="82" cy="72" rx="58" ry="50" fill="#16a34a" />
        <polygon points="48,112 30,138 72,112" fill="#16a34a" />

        {/* Blue-purple bubble */}
        <ellipse cx="122" cy="98" rx="52" ry="44" fill="#3b35e0" />
        <polygon points="100,132 130,155 148,132" fill="#3b35e0" />

        {/* Teal overlap */}
        <ellipse cx="100" cy="88" rx="22" ry="20" fill="#0d9488" opacity="0.5" />

        {/* Dots – green bubble */}
        <circle cx="65" cy="70" r="6.5" fill="white" />
        <circle cx="82" cy="70" r="6.5" fill="white" />
        <circle cx="99" cy="70" r="6.5" fill="white" />

        {/* Dots – blue bubble */}
        <circle cx="105" cy="96" r="5.5" fill="white" />
        <circle cx="120" cy="96" r="5.5" fill="white" />
        <circle cx="135" cy="96" r="5.5" fill="white" />

        {/* Accent dots */}
        <circle cx="148" cy="58" r="7" fill="#7c3aed" />
        <circle cx="42" cy="118" r="5" fill="#15803d" />
      </svg>

      {/* Text */}
      {showText && (
        <span
          style={{
            fontFamily: 'Outfit, Inter, sans-serif',
            fontWeight: 800,
            fontSize: size * 0.55,
            color: '#16a34a',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          CONNECTIFY
        </span>
      )}
    </span>
  )
}

export default ConnectifyLogo
