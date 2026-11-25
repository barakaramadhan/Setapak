import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authIntro } from "../../animations/AuthAnimation";
import FillButton from "../../components/ui/FillButton";
import InputAll from "../../components/ui/InputAll";
import ImageSignIn from "../../assets/images/imageloginpage.png";
import { useAuth } from "../../store/useAuth";

export default function SignUp() {
  const { signUp, isSupabaseReady } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  useEffect(() => authIntro(rootRef.current), []);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [pesan, setPesan] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const kirim = async (event) => {
    event.preventDefault();
    if (busy) return;
    setPesan("");
    setInfo("");
    if (password !== konfirmasi) {
      setPesan("Password dan konfirmasi password tidak sama.");
      return;
    }
    setBusy(true);
    const { error, needsConfirmation } = await signUp(email, password, nama);
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

  const field = "w-full rounded-2xl border-grey-label";
  const label = "mb-2 font-jakarta text-base text-grey-light";

  return (
    <div ref={rootRef} className="flex min-h-screen w-full bg-bright-white overflow-hidden">
      <div className="flex flex-1 flex-col justify-between p-5">
        <Link to="/" className="font-clash text-3xl font-bold text-grey-light">
          SETAPAK
        </Link>

        <div className="flex w-full flex-col items-center py-8">
          <h2 className="text-center font-jakarta text-3xl font-bold text-grey-light sm:text-4xl">
            Create an Account
          </h2>
          <p className="mt-2 text-center font-jakarta text-base">Start your journey with us.</p>

          <form onSubmit={kirim} className="mt-6 flex w-full max-w-[400px] flex-col gap-3">
            <div>
              <p className={label}>Full name</p>
              <InputAll
                autoComplete="name"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Enter Your Name"
                className={field}
              />
            </div>
            <div>
              <p className={label}>Email</p>
              <InputAll
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Your Email Address"
                className={field}
              />
            </div>
            <div>
              <p className={label}>Password</p>
              <InputAll
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className={field}
              />
            </div>
            <div>
              <p className={label}>Confirm Password</p>
              <InputAll
                type="password"
                required
                autoComplete="new-password"
                value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)}
                placeholder="Re-enter your password"
                className={field}
              />
            </div>

            {pesan && (
              <p role="alert" className="text-sm text-red-600">
                {pesan}
              </p>
            )}
            {info && <p className="text-sm text-green-700">{info}</p>}
            {!isSupabaseReady && (
              <p className="text-xs text-grey-light/60">
                Mode lokal: isi data bebas untuk mencoba aplikasi.
              </p>
            )}

            <FillButton
              type="submit"
              disabled={busy}
              fillClassName="bg-grey-light text-white"
              className="mt-4 disabled:opacity-60"
            >
              <span className="inline-flex w-full items-center justify-center gap-2">
                <span>{busy ? "Creating..." : "Sign Up"}</span>
              </span>
            </FillButton>
          </form>

          <h3 className="mt-6 text-center font-jakarta text-base text-grey-light">
            Already have an account?{" "}
            <Link to="/sign-in" className="font-jakarta text-base font-bold text-arctic-blue">
              Sign In
            </Link>
          </h3>
        </div>

        <p className="font-jakarta text-sm text-grey-light">
          © 2026 Setapak. Crafted by The Rijalz.
        </p>
      </div>

      <div className="hidden flex-1 lg:block">
        <img src={ImageSignIn} alt="City view" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}
