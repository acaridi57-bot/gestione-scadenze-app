import { cn } from '@/lib/utils';

interface PdfIconProps {
  className?: string;
}

// Standard PDF file icon (red document with "PDF" label)
export function PdfIcon({ className }: PdfIconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-destructive", className)}
    >
      <path 
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="hsl(0, 72%, 51%)"
        fillOpacity="0.15"
      />
      <path 
        d="M14 2V8H20" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <text 
        x="12" 
        y="17" 
        textAnchor="middle" 
        fontSize="6" 
        fontWeight="bold" 
        fill="currentColor"
      >
        PDF
      </text>
    </svg>
  );
}

// PDF icon with download/print arrow (red PDF document with arrow)
export function PdfPrintIcon({ className }: PdfIconProps) {
  return (
    <svg 
      viewBox="0 0 28 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-destructive", className)}
    >
      {/* PDF Document */}
      <path 
        d="M12 2H4C3.46957 2 2.96086 2.21071 2.58579 2.58579C2.21071 2.96086 2 3.46957 2 4V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H16C16.5304 22 17.0391 21.7893 17.4142 21.4142C17.7893 21.0391 18 20.5304 18 20V8L12 2Z" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="hsl(0, 72%, 51%)"
        fillOpacity="0.15"
      />
      <path 
        d="M12 2V8H18" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <text 
        x="10" 
        y="17" 
        textAnchor="middle" 
        fontSize="5" 
        fontWeight="bold" 
        fill="currentColor"
      >
        PDF
      </text>
      {/* Download Arrow */}
      <circle cx="22" cy="14" r="5.5" fill="hsl(0, 72%, 51%)" stroke="hsl(0, 72%, 40%)" strokeWidth="1"/>
      <path 
        d="M22 11V17M22 17L19.5 14.5M22 17L24.5 14.5" 
        stroke="white" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}
