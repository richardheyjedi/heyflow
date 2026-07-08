"use client";

import { useActionState, useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Foca via efeito em vez do atributo autoFocus: o React 19 injeta
  // caret-color transparente no SSR de inputs com autoFocus, causando
  // warning de hydration mismatch.
  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border/60 bg-card/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-violet text-white">
            <Lock className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Heyflow</h1>
            <p className="text-sm text-muted-foreground">Digite a senha para continuar.</p>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
