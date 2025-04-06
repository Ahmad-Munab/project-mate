import type { Metadata } from 'next';
import InvitePageClient from './InvitePageClient';

interface PageProps {
  params:  Promise<{token: string}>;
}

export const metadata: Metadata = {
  title: 'Project Invitation',
};

export default async function InvitePage({ params }: PageProps) {
const { token } = await params
  return <InvitePageClient token={token} />

}