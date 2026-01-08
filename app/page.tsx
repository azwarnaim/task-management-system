import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center  font-sans ">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16">
        <Link href="/list-task">
          <Button size="lg">Assessment</Button>
        </Link>
      </main>
    </div>
  );
}
