import InvitePageClient from './InvitePageClient';

export default async function InvitePage({ params }: { params: { token: string } }) {
  return <InvitePageClient token={params.token} />;
}
