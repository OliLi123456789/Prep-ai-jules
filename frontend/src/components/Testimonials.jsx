import React from 'react';
import './Testimonials.css';

const Testimonials = () => {
  const testimonials = [
    { id: 1, text: "F***d's score went from 1310 to 1480!" },
    { id: 2, text: "A***a's score went from 28 to 34!" },
    // Add more testimonials here if needed
  ];

  return (
    <section className="testimonials-section page-container"> {/* Use page-container for consistent padding/max-width */}
      <h2 className="page-title">Student Progress</h2> {/* Use page-title */}
      <div className="testimonials-list">
        {testimonials.map(testimonial => (
          <div key={testimonial.id} className="testimonial-item card"> {/* Use card */}
            <p>"{testimonial.text}"</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
