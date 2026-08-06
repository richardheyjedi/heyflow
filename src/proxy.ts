import { NextResponse } from "next/server";

// Plataforma aberta: a navegação não exige senha ou cookie de sessão.
// O endpoint de cron continua responsável pela própria validação via CRON_SECRET.
export default function proxy() {
  return NextResponse.next();
}
