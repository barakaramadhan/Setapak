// Menyusun semua section Dashboard User. Tambah section baru di sini

import HomeUser from "./sections/HomeUser";
import AiChat from "./sections/AiChat";

// (file section dibuat di folder ./sections, sama seperti LandingPage).
function DashboardUser() {
  return (
    <>
      <HomeUser />
      <AiChat />
    </>
  );
}

export default DashboardUser;
