// import { useUser } from "@clerk/clerk-react";
// import { useEffect } from "react";
// import axios from "axios";

// const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// export default function useRegisterTeacher() {
//   const { user, isLoaded } = useUser();

//   useEffect(() => {
//     if (!isLoaded || !user?.id) return;

//     const register = async () => {
//       try {
//         await axios.post(`${BASE_URL}/teachers`, {
//           name: user.fullName || user.firstName || "",
//           email: user.primaryEmailAddress.emailAddress,
//           clerk_user_id: user.id,
//         });
//       } catch (err) {
//         console.error("❌ Error registering teacher:", err);
//       }
//     };

//     register();
//   }, [isLoaded, user]);
// }


export default function useRegisterTeacher() {
  // Teacher accounts are provisioned by an administrator. This hook remains as
  // a compatibility no-op for any existing imports.
}
