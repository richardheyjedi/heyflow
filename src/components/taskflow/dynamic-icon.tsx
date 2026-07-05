import * as Icons from "lucide-react";
import { Folder, type LucideProps } from "lucide-react";

type DynamicIconProps = LucideProps & {
  name: string;
};

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Folder;
  return <Icon {...props} />;
}
