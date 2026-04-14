import {
  Alert as ShadcnAlert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const Alert = () => {
  const { t } = useTranslation();
  return (
    <div className="p-4">
      <ShadcnAlert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>{t("alert.welcome_title")}</AlertTitle>
        <AlertDescription>
          {t("alert.welcome_desc")}
        </AlertDescription>
      </ShadcnAlert>
    </div>
  );
};

export default Alert;
