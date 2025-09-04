import type { SVGProps } from 'react';

export function GeistLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="100"
      height="28"
      viewBox="0 0 100 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <text
        x="0"
        y="22"
        className="font-headline"
        fontSize="28"
        fontWeight="bold"
        fill="currentColor"
      >
        GEIST
      </text>
    </svg>
  );
}
