import SteamImport from "../nexar/SteamImport";

export default function SteamImportExample() {
  return (
    <div className="p-6 bg-background max-w-2xl">
      <SteamImport
        onImport={(games) => console.log("Imported games:", games)}
      />
    </div>
  );
}
