import NexarLogo from "../nexar/NexarLogo";

export default function NexarLogoExample() {
  return (
    <div className="flex flex-col gap-6 p-6 bg-background">
      <NexarLogo size="lg" />
      <NexarLogo size="md" />
      <NexarLogo size="sm" showText={false} />
    </div>
  );
}
