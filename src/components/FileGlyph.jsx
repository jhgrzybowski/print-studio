import { FileImage, FileSpreadsheet, FileText, Presentation, File } from "lucide-react";

const ICONS = { image: FileImage, pdf: FileText, sheet: FileSpreadsheet, slides: Presentation, doc: File };

export function FileGlyph({ kind, size = 16 }) {
  const Icon = ICONS[kind] || File;
  return <Icon size={size} strokeWidth={1.7} aria-hidden />;
}
