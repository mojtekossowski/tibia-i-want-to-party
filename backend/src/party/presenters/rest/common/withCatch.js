export const withCatch = (controller) => async (req, res, next) => {
  try {
    await controller(req, res)
  } catch (err) {
    next(err)
  }
}
