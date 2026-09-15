export const onRequestGet: PagesFunction = async ({ request }) => {
  return new Response(JSON.stringify({ authenticated: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
};
