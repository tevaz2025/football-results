import { User } from '../user/user.model';
import { config } from '../config';

export const seedAdmin = async (): Promise<void> => {
  try {
    const existing = await User.findOne({ email: config.admin.email });

    if (existing) {
      if (existing.role !== 'admin') {
        await User.updateOne({ _id: existing._id }, { role: 'admin' });
        console.log('✅ Admin existente actualizado a rol admin');
      } else {
        console.log('✅ Admin ya existe');
      }
      return;
    }

    await User.create({
      username: config.admin.username,
      email:    config.admin.email,
      password: config.admin.password,
      role:     'admin',
    });

    console.log(`✅ Admin creado: ${config.admin.email}`);
  } catch (err) {
    // No tira la app — solo avisa
    console.warn('⚠️  No se pudo crear el admin por defecto:', (err as Error).message);
  }
};
