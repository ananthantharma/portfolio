export const dynamic = 'force-dynamic';

import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {ADMIN_EMAIL, authOptions} from '@/lib/auth';

/**
 * Hands the ESP32-CAM broker connection details to the browser — admin only.
 * The credentials live in Vercel env vars and never ship in the client bundle;
 * only an authenticated admin session can pull them at runtime.
 *
 * Required env:
 *   MQTT_WS_URL   wss://<id>.s1.eu.hivemq.cloud:8884/mqtt
 *   MQTT_USER     camclient
 *   MQTT_PASS     <broker password>
 * Optional:
 *   CAM_TOPIC_BASE   defaults to "cam9f3a" — must match the firmware's TOPIC_BASE
 */
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!session || email !== ADMIN_EMAIL) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }

  const url = process.env.MQTT_WS_URL;
  const username = process.env.MQTT_USER;
  const password = process.env.MQTT_PASS;

  if (!url || !username || !password) {
    return NextResponse.json(
      {error: 'Camera MQTT env vars are not configured (MQTT_WS_URL / MQTT_USER / MQTT_PASS)'},
      {status: 500},
    );
  }

  return NextResponse.json(
    {url, username, password, topicBase: process.env.CAM_TOPIC_BASE || 'cam9f3a'},
    {headers: {'Cache-Control': 'no-store'}},
  );
}
