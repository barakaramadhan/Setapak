import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authIntro } from "../../animations/AuthAnimation";
import FillButton from "../../components/ui/FillButton";
import InputAll from "../../components/ui/InputAll";
import ImageSignIn from "../../assets/images/imageloginpage.png";
import { useAuth } from "../../store/useAuth";

export default function SignIn() {
  const { signIn, isSupabaseReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef(null);
  useEffect(() => authIntro(rootRef.current), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pesan, setPesan] = useState("");
  const [busy, setBusy] = useState(false);

  const kirim = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setPesan("");
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      setPesan(error);
      return;
    }
    navigate(location.state?.from || "/dashboard", { replace: true });
  };

  return (
    <div ref={rootRef} className="flex min-h-screen w-full bg-bright-white overflow-hidden">
      <div className="flex flex-1 flex-col justify-between p-5">
        <Link to="/" className="font-clash text-3xl font-bold text-grey-light">
          SETAPAK
        </Link>

        <div className="flex w-full flex-col items-center py-8">
          <h2 className="text-center font-jakarta text-3xl font-bold text-grey-light sm:text-4xl">
            Welcome Back!
          </h2>
          <p className="mt-2 text-center font-jakarta text-base">
            Let&apos;s get you signed in securely
          </p>

          <form onSubmit={kirim} className="mt-10 flex w-full max-w-[400px] flex-col gap-5">
            <div>
              <p className="mb-2 font-jakarta text-base text-grey-light">Email</p>
              <InputAll
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Your Email Address"
                className="w-full rounded-2xl border-grey-label"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-jakarta text-base text-grey-light">Password</p>
              </div>
              <InputAll
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your Password"
                className="w-full rounded-2xl border-grey-label"
              />
            </div>

            {pesan && (
              <p role="alert" className="text-sm text-red-600">
                {pesan}
              </p>
            )}
            {!isSupabaseReady && (
              <p className="text-xs text-grey-light/60">
                Mode lokal: isi email/password bebas untuk mencoba aplikasi.
              </p>
            )}

            <FillButton
              type="submit"
              disabled={busy}
              fillClassName="bg-grey-light text-white"
              className="disabled:opacity-60"
            >
              <span className="inline-flex w-full items-center justify-center gap-2">
                <span>{busy ? "Signing in..." : "Log In"}</span>
              </span>
            </FillButton>
          </form>

          <h3 className="mt-6 text-center font-jakarta text-base text-grey-light">
            Don&apos;t have an account yet?{" "}
            <Link to="/sign-up" className="font-jakarta text-base font-bold text-arctic-blue">
              Sign Up
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
