import {
  Alert as ShadcnAlert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

const Alert = () => {
  return (
    <div className="p-4">
      <ShadcnAlert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Benvenuto nel gestionale Amazon</AlertTitle>
        <AlertDescription>
          Seleziona una sezione dal menu per iniziare.
        </AlertDescription>
      </ShadcnAlert>
    </div>
  );
};

export default Alert;
