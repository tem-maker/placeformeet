const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = 3000;

const config = {
  user: 'sa',
  password: '1234qwer',
  server: 'localhost',
  port: 1433,
  database: 'dreamdate',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'homepage.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/registration.html', (req, res) => res.sendFile(path.join(__dirname, 'registration.html')));
app.get('/profile.html', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));
app.get('/logged_in_homepage.html', (req, res) => res.sendFile(path.join(__dirname, 'logged_in_homepage.html')));
app.get('/finder.html', (req, res) => res.sendFile(path.join(__dirname, 'finder.html')));
app.get('/messages.html', (req, res) => res.sendFile(path.join(__dirname, 'messages.html')));

app.post('/register', async (req, res) => {
  const { name, email, password, day, month, year } = req.body;
  const birthdate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await sql.connect(config);
    await sql.query`
      INSERT INTO users (name, birthdate, email, password)
      VALUES (${name}, ${birthdate}, ${email}, ${hashedPassword})
    `;
    console.log('Новый пользователь зарегистрирован:', name);
    res.redirect('/login.html');
  } catch (err) {
    console.error('Ошибка при регистрации:', err);
    res.status(500).send('Ошибка сервера при регистрации');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM users WHERE email = ${email}`;
    const user = result.recordset[0];

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).send('Неверный логин или пароль');
    }

    console.log('Пользователь вошел:', user.name);
    res.json({ userId: user.id, email: user.email });
  } catch (err) {
    console.error('Ошибка при входе:', err);
    res.status(500).send('Ошибка сервера при входе');
  }
});

app.get('/api/user', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send('Email обязателен');

  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM users WHERE email = ${email}`;
    const user = result.recordset[0];
    if (!user) return res.status(404).send('Пользователь не найден');

    let age = null;
    if (user.birthdate) {
      const birthDate = new Date(user.birthdate);
      const ageDiff = new Date().getFullYear() - birthDate.getFullYear();
      const m = new Date().getMonth() - birthDate.getMonth();
      age = m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate()) ? ageDiff - 1 : ageDiff;
    }

    // Преобразование birthdate в ISO-строку
    if (user.birthdate instanceof Date && !isNaN(user.birthdate)) {
      user.birthdate = user.birthdate.toISOString().split('T')[0]; // yyyy-mm-dd
    }

    res.json({
      id: user.id,
      name: user.name,
      bio: user.bio || 'Нет информации',
      photo: user.photo || 'profile_photo.jpg',
      zodiac_sign: user.zodiac_sign || 'Не указан',
      city: user.city || 'Не указано',
      birthdate: user.birthdate,
    });
  } catch (err) {
    console.error('Ошибка при загрузке данных пользователя:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.post('/api/updateProfile', async (req, res) => {
  const { email, name, zodiac_sign, city, bio } = req.body;
  if (!email) return res.status(400).send('Email обязателен');

  try {
    await sql.connect(config);
    await sql.query`
      UPDATE users
      SET name = ${name}, zodiac_sign = ${zodiac_sign}, city = ${city}, bio = ${bio}
      WHERE email = ${email}
    `;
    console.log(`Профиль обновлен для пользователя: ${email}`);
    res.status(200).send('Профиль обновлен');
  } catch (err) {
    console.error('Ошибка при обновлении профиля:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/api/users', async (req, res) => {
  const excludeEmail = req.query.exclude;

  try {
    await sql.connect(config);
    let result;
    if (excludeEmail) {
      result = await sql.query`
        SELECT id, name, email, bio, zodiac_sign, city, ISNULL(photo, 'profile_photo.jpg') AS photo
        FROM users
        WHERE email != ${excludeEmail}
        ORDER BY id
      `;
    } else {
      result = await sql.query`
        SELECT id, name, email, bio, zodiac_sign, city, ISNULL(photo, 'profile_photo.jpg') AS photo
        FROM users
        ORDER BY id
      `;
    }

    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка при получении списка пользователей:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT id, name, birthdate, bio, zodiac_sign, city, photo
      FROM users
      WHERE id = ${userId}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).send('Пользователь не найден');
    }

    const user = result.recordset[0];

    // Преобразование birthdate в ISO-строку
    if (user.birthdate instanceof Date && !isNaN(user.birthdate)) {
      user.birthdate = user.birthdate.toISOString().split('T')[0]; // yyyy-mm-dd
    }

    res.json(user);
  } catch (err) {
    console.error('Ошибка при получении пользователя по ID:', err);
    res.status(500).send('Ошибка сервера');
  }
});

// Обновлённый запрос к сообщениям
app.get('/api/messages', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send('Email обязателен');

  try {
    await sql.connect(config);

    const userResult = await sql.query`SELECT id FROM users WHERE email = ${email}`;
    const currentUser = userResult.recordset[0];
    if (!currentUser) return res.status(404).send('Пользователь не найден');

    const userId = currentUser.id;

    const result = await sql.query(`
      WITH RankedMessages AS (
        SELECT
          m.*,
          CASE
            WHEN m.sender_id = ${userId} THEN m.receiver_id
            ELSE m.sender_id
          END AS partner_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              CASE
                WHEN m.sender_id = ${userId} THEN m.receiver_id
                ELSE m.sender_id
              END
            ORDER BY m.timestamp DESC
          ) AS rn
        FROM messages m
        WHERE m.sender_id = ${userId} OR m.receiver_id = ${userId}
      )
      SELECT
        rm.partner_id,
        u.name AS partner_name,
        ISNULL(u.photo, 'profile_photo.jpg') AS partner_photo,
        rm.message_text AS last_message,
        rm.timestamp
      FROM RankedMessages rm
      JOIN users u ON u.id = rm.partner_id
      WHERE rm.rn = 1
      ORDER BY rm.timestamp DESC;
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка при получении сообщений:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.post('/api/sendMessage', async (req, res) => {
  const { senderId, receiverId, message } = req.body;
  if (!senderId || !receiverId || !message) {
    return res.status(400).send('Недостаточно данных');
  }

  try {
    await sql.connect(config);
    await sql.query`
      INSERT INTO messages (sender_id, receiver_id, message_text)
      VALUES (${senderId}, ${receiverId}, ${message})
    `;
    console.log(`Сообщение отправлено от ${senderId} к ${receiverId}`);
    res.status(200).send('Сообщение отправлено');
  } catch (err) {
    console.error('Ошибка при отправке сообщения:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.post('/api/like', async (req, res) => {
  const { likerId, likedId } = req.body;

  if (!likerId || !likedId) {
    return res.status(400).send('Недостаточно данных');
  }

  try {
    await sql.connect(config);

    // Получаем имя лайкнувшего
    const result = await sql.query`SELECT name FROM users WHERE id = ${likerId}`;
    const likerName = result.recordset[0]?.name || 'Пользователь';

    const message = `${likerName} (ID:${likerId}) вам понравился!`;

    // Вставляем уведомление
    await sql.query`
      INSERT INTO notifications (user_id, message)
      VALUES (${likedId}, ${message})
    `;

    console.log(`Лайк от ${likerName} (ID ${likerId}) -> пользователю с ID ${likedId}`);
    res.status(200).send('Уведомление отправлено');
  } catch (err) {
    console.error('Ошибка при отправке уведомления:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/api/notifications', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send('Email обязателен');

  try {
    await sql.connect(config);
    const userResult = await sql.query`SELECT id FROM users WHERE email = ${email}`;
    const currentUser = userResult.recordset[0];
    if (!currentUser) return res.status(404).send('Пользователь не найден');

    const result = await sql.query`
      SELECT * FROM notifications WHERE user_id = ${currentUser.id} ORDER BY timestamp DESC
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка при получении уведомлений:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
});
