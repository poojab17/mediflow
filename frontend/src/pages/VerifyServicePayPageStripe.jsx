import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:4000";

const VerifyServicePayPageStripe = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyServicePayment = async () => {
      console.log("VERIFY PAGE HIT");

      const params = new URLSearchParams(location.search);
      const sessionId = params.get("session_id");

      console.log("SESSION ID FROM URL:", sessionId);

      // ❌ No session → redirect immediately
      if (!sessionId) {
        navigate("/appointments?service_payment=Failed", { replace: true });
        return;
      }

      try {
        const res = await axios.get(
          `${API_BASE}/api/service-appointments/confirm`,
          {
            params: { session_id: sessionId },
          }
        );

        console.log("API RESPONSE:", res.data);

        if (res?.data?.success) {
          // ✅ SUCCESS → REDIRECT
          navigate("/appointments?service_payment=Paid", { replace: true });
        } else {
          navigate("/appointments?service_payment=Failed", { replace: true });
        }

      } catch (error) {
        console.error("Payment verification error:", error);
        navigate("/appointments?service_payment=Failed", { replace: true });
      }
    };

    verifyServicePayment();
  }, [location.search, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg font-semibold">Verifying payment...</p>
    </div>
  );
};

export default VerifyServicePayPageStripe;