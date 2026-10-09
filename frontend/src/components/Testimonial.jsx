import React, { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { testimonialStyles } from "../assets/dummyStyles";

const Testimonial = () => {
  const scrollRefLeft = useRef(null);
  const scrollRefRight = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

const testimonials = [
  {
    id: 1,
    name: "Dr. Rahul Sharma",
    role: "Cardiologist",
    rating: 5,
    text: "This platform has made appointment management very smooth. I can now focus more on patients instead of handling bookings manually.",
    image:
      "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80",
    type: "doctor",
  },
  {
    id: 2,
    name: "Priya Verma",
    role: "Patient",
    rating: 5,
    text: "Booking appointment is very easy now. I didn’t have to stand in long queues, everything is available online.",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    type: "patient",
  },
  {
    id: 3,
    name: "Dr. Ankit Mehta",
    role: "Pediatrician",
    rating: 4,
    text: "Our clinic workflow has improved a lot after using this system. Managing patients and appointments is now properly organized.",
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
    type: "doctor",
  },
  {
    id: 4,
    name: "Rohit Singh",
    role: "Patient",
    rating: 5,
    text: "Very helpful platform. I can book appointment anytime without calling the hospital again and again.",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    type: "patient",
  },
  {
    id: 5,
    name: "Dr. Sneha Kapoor",
    role: "Dermatologist",
    rating: 5,
    text: "The reminder feature is very useful. Patients are coming on time now and missed appointments have reduced a lot.",
    image:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=400&q=80",
    type: "doctor",
  },
  {
    id: 6,
    name: "Amit Yadav",
    role: "Patient",
    rating: 5,
    text: "Earlier I had to wait a lot in hospital, now everything is scheduled properly. Very convenient system.",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    type: "patient",
  },
];

  const leftTestimonials = testimonials.filter((t) => t.type === "doctor");
  const rightTestimonials = testimonials.filter((t) => t.type === "patient");

  useEffect(() => {
    const scrollLeft = scrollRefLeft.current;
    const scrollRight = scrollRefRight.current;
    if (!scrollLeft || !scrollRight) return;

    let scrollSpeed = 0.5; // preserved animation speed
    let rafId;

    const smoothScroll = () => {
      if (!isPaused) {
        scrollLeft.scrollTop += scrollSpeed;
        scrollRight.scrollTop -= scrollSpeed;

        // seamless infinite loop
        if (scrollLeft.scrollTop >= scrollLeft.scrollHeight / 2) {
          scrollLeft.scrollTop = 0;
        }
        if (scrollRight.scrollTop <= 0) {
          scrollRight.scrollTop = scrollRight.scrollHeight / 2;
        }
      }
      rafId = requestAnimationFrame(smoothScroll);
    };

    rafId = requestAnimationFrame(smoothScroll);
    return () => cancelAnimationFrame(rafId);
  }, [isPaused]);

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={
          i < rating
            ? testimonialStyles.activeStar
            : testimonialStyles.inactiveStar
        }
      >
        <Star className={testimonialStyles.star} />
      </span>
    ));

  const TestimonialCard = ({ testimonial, direction }) => (
    <div
      className={`${testimonialStyles.testimonialCard} ${
        direction === "left"
          ? testimonialStyles.leftCardBorder
          : testimonialStyles.rightCardBorder
      }`}
    >
      <div className={testimonialStyles.cardContent}>
        <img
          src={testimonial.image}
          alt={testimonial.name}
          className={testimonialStyles.avatar}
        />
        <div className={testimonialStyles.textContainer}>
          <div className={testimonialStyles.nameRoleContainer}>
            <div>
              <h4
                className={`${testimonialStyles.name} ${
                  direction === "left"
                    ? testimonialStyles.leftName
                    : testimonialStyles.rightName
                }`}
              >
                {testimonial.name}
              </h4>
              <p className={testimonialStyles.role}>{testimonial.role}</p>
            </div>
            <div className={testimonialStyles.starsContainer}>
              {renderStars(testimonial.rating)}
            </div>
          </div>

          <p className={testimonialStyles.quote}>"{testimonial.text}"</p>

          {/* Stars on small screens beneath text */}
          <div className={testimonialStyles.mobileStarsContainer}>
            {renderStars(testimonial.rating)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={testimonialStyles.container}>
      <div className={testimonialStyles.headerContainer}>
        <h2 className={testimonialStyles.title}>Trusted Experiences</h2>
        <p className={testimonialStyles.subtitle}>
         Real feedback from doctors and patients who use our platform to manage care more efficiently.
        </p>
      </div>

      <div
        className={testimonialStyles.grid}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left (Doctors) */}
        <div
          className={`${testimonialStyles.columnContainer} ${testimonialStyles.leftColumnBorder}`}
        >
          <div
            className={`${testimonialStyles.columnHeader} ${testimonialStyles.leftColumnHeader}`}
          >
            👩‍⚕️ Medical Professionals
          </div>
          <div
            ref={scrollRefLeft}
            className={testimonialStyles.scrollContainer}
            // touch support: pause while swiping
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {[...leftTestimonials, ...leftTestimonials].map((t, i) => (
              <TestimonialCard
                key={`L-${i}`}
                testimonial={t}
                direction="left"
              />
            ))}
          </div>
        </div>

        {/* Right (Patients) */}
        <div
          className={`${testimonialStyles.columnContainer} ${testimonialStyles.rightColumnBorder}`}
        >
          <div
            className={`${testimonialStyles.columnHeader} ${testimonialStyles.rightColumnHeader}`}
          >
            🧑‍💼 Patients
          </div>

          <div
            ref={scrollRefRight}
            className={testimonialStyles.scrollContainer}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {[...rightTestimonials, ...rightTestimonials].map((t, i) => (
              <TestimonialCard
                key={`R-${i}`}
                testimonial={t}
                direction="right"
              />
            ))}
          </div>
        </div>
      </div>

      {/* helper styles */}
      <style>{testimonialStyles.animationStyles}</style>
    </div>
  );
};

export default Testimonial;
