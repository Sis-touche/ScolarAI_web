const animations = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  slideUp: { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -30 } },
  slideRight: { initial: { opacity: 0, x: -50 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 50 } },
};

function PageWrapper({ children, animation = 'slideUp' }) {
  const anim = animations[animation];
  return (
    <motion.div {...anim} transition={{ duration: 0.2 }}>
      {children}
    </motion.div>
  );
}