// Local / VPS entry point. On Vercel, api/index.js serves the same app instead.
import app, { paymentStatus } from './app.js';

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`TheBridge running on http://localhost:${PORT}`);
  console.log(paymentStatus());
});
