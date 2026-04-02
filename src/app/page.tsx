import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Rocket className="h-12 w-12 text-primary" />
      <h1 className="text-3xl font-bold tracking-tight text-blue-600">Culture Log</h1>
      <p className="text-muted-foreground">Your app is ready to go.</p>
      <Button>Get Started</Button>
    </div>
  );
}
