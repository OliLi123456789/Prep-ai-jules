import React from 'react';
import './Testimonials.css';

const Testimonials = () => {
  const testimonials = [
    { id: 1, text: "F***d's score went from 1310 to 1480!" },
    { id: 2, text: "A***a's score went from 28 to 34!" },
    // Add more testimonials here if needed
  ];

  return (
    <section className="testimonials-section">
      <h2>Student Progress</h2>
      <div className="testimonials-list">
        {testimonials.map(testimonial => (
          <div key={testimonial.id} className="testimonial-item">
            <p>"{testimonial.text}"</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
