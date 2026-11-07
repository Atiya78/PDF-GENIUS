import React from "react";
import { ToolPageShell } from "@/components/upload/ToolPageShell";

interface ImageToolShellProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  /** Hide the title/description header (used on the upload empty state). */
  hideHeader?: boolean;
  children: React.ReactNode;
}

export const ImageToolShell: React.FC<ImageToolShellProps> = ({
  title,
  description,
  icon,
  iconBg,
  hideHeader = false,
  children,
}) => {
  return (
    <ToolPageShell
      title={title}
      description={description}
      icon={icon}
      iconBoxClassName={iconBg}
      showHeader={!hideHeader}
    >
      {hideHeader ? (
        children
      ) : (
        <div className="bg-[#fffdf9] rounded-[14px] border border-[#e7e0d5] shadow-[0_24px_48px_-36px_rgba(28,25,23,0.45)] p-5 md:p-8">
          {children}
        </div>
      )}
    </ToolPageShell>
  );
};
