import UpdateChecker from "../nexar/UpdateChecker";

export default function UpdateCheckerExample() {
  return (
    <div className="p-6 bg-background min-h-[400px]">
      <UpdateChecker
        currentVersion="1.0.0"
        onDismiss={() => console.log("Dismissed")}
      />
    </div>
  );
}
