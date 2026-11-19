import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FillButton from "../../components/ui/FillButton";
import InputAll from "../../components/ui/InputAll";
import { useAuth } from "../../store/useAuth";

export default function SignUp() {
  const { signUp, isSupabaseReady } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pesan, setPesan] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const kirim = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setPesan("");
    setInfo("");
    const { error, needsConfirmation } = await signUp(email, password);
    setBusy(false);
    if (error) {
      setPesan(error);
      return;
    }
    if (needsConfirmation) {
      setInfo("Akun dibuat. Cek email untuk verifikasi, lalu masuk lagi ya.");
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white-new px-4 py-10 font-jakarta">
      <form
        onSubmit={kirim}
        className="w-full max-w-md rounded-3xl border-2 border-grey-label/50 bg-white p-8 shadow-lg"
      >
        <span className="font-clash text-2xl font-bold text-dark-brown-new">
          SETAPAK
        </span>
        <h1 className="mt-5 text-3xl font-bold text-grey-light">Buat akun</h1>
        <p className="mt-1 text-sm text-grey-light/70">
          Simpan rencana perjalanan dan lihat jadwalmu di kalender.
        </p>

        <label className="mt-6 block text-sm font-semibold text-grey-light">
          Email
          <InputAll
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@email.com"
            className="mt-2 w-full rounded-xl border-grey-label/60 bg-grey-label/15 py-3"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-grey-light">
          Password
          <InputAll
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimal 6 karakter"
            className="mt-2 w-full rounded-xl border-grey-label/60 bg-grey-label/15 py-3"
          />
        </label>

        {pesan && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {pesan}
          </p>
        )}
        {info && (
          <p role="status" className="mt-4 text-sm text-[#567b9c]">
            {info}
          </p>
        )}
        {!isSupabaseReady && (
          <p className="mt-4 text-xs text-grey-light/60">
            Mode lokal: isi email/password bebas untuk mencoba aplikasi.
          </p>
        )}

        <FillButton
          type="submit"
          disabled={busy}
          className="mt-6 w-full !rounded-xl !py-3 text-base disabled:opacity-60"
          fillClassName="bg-dark-brown-new text-bright-white rounded-xl"
        >
          {busy ? "Membuat..." : "Sign up"}
        </FillButton>

        <p className="mt-5 text-center text-sm text-grey-light/70">
          Sudah punya akun?{" "}
          <Link to="/login" className="font-semibold text-[#6f9abf] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
