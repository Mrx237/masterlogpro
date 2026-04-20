import { Button } from "@/components/ui/button";
import { buildWhatsAppLink } from "@/lib/constants";
import { MessageCircle } from "lucide-react";

interface Props {
  message?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function WhatsAppButton({
  message = "Bonjour, je souhaite m'abonner à MasterLogPro. J'ai effectué le paiement via Mobile Money. Voici la preuve.",
  label = "Contacter sur WhatsApp",
  variant = "default",
  size = "default",
  className,
}: Props) {
  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={className ?? "bg-[#25D366] hover:bg-[#20bd5a] text-white border-0"}
    >
      <a href={buildWhatsAppLink(message)} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
