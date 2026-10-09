import axios from "axios";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const MessageBubble = ({ msg }) => {

  const { user } = useUser();
  const navigate = useNavigate();

  const bookAppointment =
    async (doc, slot) => {

      try {

        if (!user) {

          alert(
            "Please login first"
          );

          return;
        }

        const token =
          await user.getToken();

        await axios.post(

          "http://localhost:4000/api/appointments",

          {
            doctorId:
              doc._id,

            patientName:
              user.fullName,

            mobile:
              "9999999999",

            date:
              new Date()
                .toISOString()
                .split("T")[0],

            time:
              slot,

            fee:
              doc.fee || 0,

            paymentMethod:
              "Cash",
          },

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        alert(
          "Appointment booked ✅"
        );

      } catch (err) {

        console.error(
          "BOOK ERROR:",
          err
        );

        alert(
          "Booking failed ❌"
        );
      }
    };

  const riskStyles = {

    LOW:
      "bg-green-50 border-green-200 text-green-800",

    MEDIUM:
      "bg-yellow-50 border-yellow-200 text-yellow-800",

    HIGH:
      "bg-orange-50 border-orange-200 text-orange-800",

    CRITICAL:
      "bg-red-50 border-red-200 text-red-800",
  };

  return (

    <div
      className="
      flex-1
      p-3
      overflow-y-auto
      max-h-96
      backdrop-blur-sm"
    >

      {/* MESSAGE */}

      <div

        className={`

          max-w-[95%]
          px-4
          py-2
          rounded-2xl
          text-sm
          shadow-md
          leading-relaxed

          ${msg.sender ===
            "user"

            ? "bg-blue-500 text-white rounded-br-none"

            : "bg-white/80 backdrop-blur-md border border-white/40 text-gray-800 rounded-bl-none"

          }
        `}
      >

        <div
          className="
          whitespace-pre-line"
        >
          {msg.text}
        </div>

        {
          msg.safety && (

            <div

              className={`

      mt-3
      rounded-2xl
      border
      p-3
      shadow-sm

      ${riskStyles[
                msg.safety.riskLevel
                ] ||

                riskStyles.MEDIUM

                }
    `}
            >

              <div className="font-bold mb-2">

                🛡 CuraShield Medical Safety Analysis

              </div>

              <div className="text-xs space-y-1">

                <p>

                  <strong>
                    Risk Level:
                  </strong>{" "}

                  {msg.safety.riskLevel}

                </p>

                <p>

                  <strong>
                    Severity Score:
                  </strong>{" "}

                  {msg.safety.severityScore}/100

                </p>

                <p>

                  <strong>
                    Urgent Care:
                  </strong>{" "}

                  {

                    msg.safety
                      .requiresUrgentCare

                      ? "Required"

                      : "Not Required"

                  }

                </p>

                <p>

                  <strong>
                    Reason:
                  </strong>{" "}

                  {msg.safety.reason}

                </p>

                <p>

                  <strong>
                    Recommendation:
                  </strong>{" "}

                  {

                    msg.safety
                      .recommendedAction

                  }

                </p>

              </div>

            </div>
          )
        }

        {
          msg.promptGuard &&
          msg.promptGuard.blocked && (

            <div
              className="
      mt-3
      rounded-xl
      border
      border-amber-300
      bg-amber-50
      p-3
      shadow-sm"
            >

              <div className="font-bold">

                🛡 CuraShield Prompt Guard

              </div>

              <div className="text-xs mt-2">

                Potential prompt injection detected.

              </div>

              <div className="text-xs mt-1">

                Reason:

                {" "}

                {msg.promptGuard.reason}

              </div>

            </div>
          )
        }

        {/* RAG CONTEXT */}

        {

          msg.context && (

            <div

              className="
              mt-2
              p-2
              rounded-2xl
              bg-gradient-to-br
              from-gray-50
              to-gray-100
              border
              border-gray-200
              shadow-inner
              max-h-52
              overflow-y-auto"
            >

              <div
                className="
                flex
                items-center
                gap-1
                mb-2"
              >

                <div
                  className="
                  w-2
                  h-2
                  rounded-full
                  bg-blue-500"
                />

                <p
                  className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-wide
                  text-blue-600"
                >
                  Retrieved Context
                </p>

              </div>

              <p
                className="
                text-sm
                leading-relaxed
                text-gray-700
                whitespace-pre-line"
              >
                {msg.context}
              </p>

            </div>
          )
        }

      </div>

      {/* DOCTOR CARDS */}

      {

        msg.sender === "bot" &&

        Array.isArray(
          msg.doctors
        ) &&

        msg.doctors.map(

          (doc) => (

            <div

              key={doc._id}

              onClick={() => {

                if (

                  msg.type ===
                  "available" &&

                  Array.isArray(
                    doc.availableSlots
                  ) &&

                  doc.availableSlots
                    .length > 0

                ) {

                  bookAppointment(

                    doc,

                    doc
                      .availableSlots[0]
                  );

                } else {

                  navigate(
                    `/doctors/${doc._id}`
                  );
                }
              }}

              className="
              mt-2
              w-full
              bg-white
              border
              rounded-xl
              p-3
              shadow-sm
              cursor-pointer
              hover:shadow-md
              hover:border-blue-300
              transition"
            >

              {/* HEADER */}

              <div
                className="
                flex
                items-center
                gap-3"
              >

                <img

                  src={
                    doc.imageUrl ||

                    "https://via.placeholder.com/40"
                  }

                  alt={doc.name}

                  className="
                  w-10
                  h-10
                  rounded-full
                  object-cover"
                />

                <div>

                  <p
                    className="
                    font-semibold
                    text-sm"
                  >
                    {doc.name}
                  </p>

                  <p
                    className="
                    text-xs
                    text-gray-500"
                  >
                    {doc.specialization}
                  </p>

                  <div
                    className="
                    text-yellow-500
                    text-xs"
                  >

                    {

                      "⭐".repeat(
                        Math.round(
                          doc.rating || 0
                        )
                      )
                    }

                    <span
                      className="
                      text-gray-400
                      ml-1"
                    >
                      (
                      {doc.rating || 0}
                      )
                    </span>

                  </div>

                </div>

              </div>

              {/* SLOT BUTTONS */}

              {

                msg.type ===
                "available" &&

                Array.isArray(
                  doc.availableSlots
                ) && (

                  <div
                    className="
                    flex
                    flex-wrap
                    gap-2
                    mt-2"
                  >

                    {

                      doc.availableSlots.map(

                        (
                          slot,
                          i
                        ) => (

                          <button

                            key={i}

                            onClick={(e) => {

                              e.stopPropagation();

                              bookAppointment(
                                doc,
                                slot
                              );
                            }}

                            className="
                            bg-blue-100
                            hover:bg-blue-200
                            text-xs
                            px-2
                            py-1
                            rounded"
                          >
                            {slot}
                          </button>
                        )
                      )
                    }

                  </div>
                )
              }

              {/* NO SLOT */}

              {

                msg.type ===
                "no-slots" && (

                  <>

                    <p
                      className="
                      text-xs
                      text-gray-500
                      mt-2"
                    >
                      No slots today —
                      book for later
                    </p>

                    <button

                      onClick={(e) => {

                        e.stopPropagation();

                        navigate(
                          `/doctors/${doc._id}`
                        );
                      }}

                      className="
                      mt-2
                      text-blue-600
                      text-xs
                      underline"
                    >
                      View & Book
                    </button>

                  </>
                )
              }

            </div>
          )
        )
      }

    </div>
  );
};

export default MessageBubble;