const Testimonials = ({testimonials, currentTestimonial, styles}) => {
  return (
    <section 
      className={styles.testimonialSection}
    >
      <div className={styles.container}>
        <div className={styles.testimonialCarousel}>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`${styles.testimonial} ${index === currentTestimonial ? styles.active : ''}`}
            >
              <blockquote className={styles.testimonialQuote}>"{testimonial.quote}"</blockquote>
              <cite className={styles.testimonialAuthor}>—{testimonial.author}</cite>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials