export const onRequestPost: PagesFunction = async ({ request }) => {
  return new Response(JSON.stringify({ success: true, message: 'کلمه عبور با موفقیت تغییر یافت.' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
};
