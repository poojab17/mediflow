import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AuthRedirect = () => {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const checkRole = async () => {
      try {
        if (!isLoaded || !isSignedIn) return;

        const res = await axios.get("http://localhost:4000/api/user/me", {
          withCredentials: true,
        });

        const role = res.data.role;

        if (role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Role check failed:", error);
      }
    };

    checkRole();
  }, [isLoaded, isSignedIn]);

  return <div>Loading...</div>;
};

export default AuthRedirect;