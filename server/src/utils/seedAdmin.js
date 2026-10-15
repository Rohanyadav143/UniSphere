export async function seedAdmin(UserModel, email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  let admin = await UserModel.findOne({ email: normalizedEmail }).select("+password");
  if (!admin) {
    admin = new UserModel({ name: "UniSphere Admin", email: normalizedEmail });
  }
  admin.password = password;
  admin.role = "admin";
  await admin.save();
  return admin;
}
