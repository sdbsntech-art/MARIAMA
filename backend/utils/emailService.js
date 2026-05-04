const nodemailer = require('nodemailer');

// Configuration du transporteur SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, // true pour 465, false pour les autres ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Génère un template HTML responsive
 * @param {string} title Titre du mail
 * @param {string} content Contenu principal
 * @param {string} callToAction Texte du bouton (optionnel)
 * @param {string} url URL du bouton (optionnel)
 */
const getHtmlTemplate = (title, content, callToAction = '', url = '#') => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #004a99 0%, #003366 100%); color: #ffffff; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 30px; color: #333333; line-height: 1.6; }
    .content h2 { color: #004a99; margin-top: 0; }
    .footer { background: #f4f7f9; color: #777777; padding: 20px; text-align: center; font-size: 12px; }
    .button { display: inline-block; padding: 12px 25px; background-color: #004a99; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; transition: background 0.3s; }
    .button:hover { background-color: #003366; }
    .highlight { color: #004a99; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SoutenancePro</h1>
      <p>ESP - UCAD</p>
    </div>
    <div class="content">
      <h2>${title}</h2>
      <div>${content}</div>
      ${callToAction ? `<a href="${url}" class="button">${callToAction}</a>` : ''}
    </div>
    <div class="footer">
      <p>&copy; 2025 École Supérieure Polytechnique - UCAD. Tous droits réservés.</p>
      <p>Ceci est un message automatique, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Envoie un mail de confirmation d'inscription à l'étudiant
 */
const sendStudentRegistrationEmail = async (student) => {
  const title = "Confirmation d'Inscription";
  const content = `
    <p>Bonjour <span class="highlight">${student.prenom} ${student.nom}</span>,</p>
    <p>Nous vous confirmons que votre inscription sur la plateforme <strong>SoutenancePro</strong> a été effectuée avec succès.</p>
    <p><strong>Détails de votre dossier :</strong></p>
    <ul>
      <li><strong>Filière :</strong> ${student.filiere}</li>
      <li><strong>Sujet :</strong> ${student.sujet}</li>
    </ul>
    <p>Vous recevrez bientôt des informations concernant votre encadreur et votre date de soutenance.</p>
  `;

  return transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: student.email,
    subject: `[SoutenancePro] Confirmation d'inscription - ${student.prenom} ${student.nom}`,
    html: getHtmlTemplate(title, content),
  });
};

/**
 * Envoie un mail de notification à l'encadreur
 */
const sendSupervisorAssignmentEmail = async (supervisor, student) => {
  const title = "Nouvelle Affectation d'Étudiant";
  const content = `
    <p>Bonjour <span class="highlight">M./Mme ${supervisor.prenom} ${supervisor.nom}</span>,</p>
    <p>Un nouvel étudiant vous a été affecté pour l'encadrement de son projet de fin d'études.</p>
    <p><strong>Informations sur l'étudiant :</strong></p>
    <ul>
      <li><strong>Nom :</strong> ${student.prenom} ${student.nom}</li>
      <li><strong>Filière :</strong> ${student.filiere}</li>
      <li><strong>Sujet :</strong> ${student.sujet}</li>
      <li><strong>Email :</strong> ${student.email || 'Non renseigné'}</li>
    </ul>
    <p>Vous pouvez consulter les détails complets sur votre tableau de bord.</p>
  `;

  return transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: supervisor.email,
    subject: `[SoutenancePro] Nouvel étudiant à encadrer : ${student.prenom} ${student.nom}`,
    html: getHtmlTemplate(title, content, 'Accéder au Dashboard', `${process.env.FRONTEND_URL}/login.html`),
  });
};

/**
 * Envoie un mail de notification de planification de soutenance
 */
const sendDefenseScheduledEmail = async (student, supervisor, defense) => {
  const title = "Planification de votre Soutenance";
  const dateFormatted = new Date(defense.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const content = `
    <p>Bonjour <span class="highlight">${student.prenom} ${student.nom}</span>,</p>
    <p>Nous avons le plaisir de vous informer que votre date de soutenance a été fixée.</p>
    <p><strong>Détails de la soutenance :</strong></p>
    <ul>
      <li><strong>Date :</strong> ${dateFormatted}</li>
      <li><strong>Heure :</strong> ${defense.heure}</li>
      <li><strong>Salle :</strong> ${defense.salle}</li>
      <li><strong>Sujet :</strong> ${student.sujet}</li>
      ${supervisor ? `<li><strong>Encadreur :</strong> ${supervisor.prenom} ${supervisor.nom}</li>` : ''}
      ${defense.jury ? `<li><strong>Jury :</strong> ${defense.jury}</li>` : ''}
    </ul>
    <p>Merci de vous présenter 15 minutes avant l'heure indiquée avec votre présentation sur clé USB.</p>
  `;

  const emails = [student.email];
  if (supervisor && supervisor.email) {
    emails.push(supervisor.email);
  }

  return transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: emails.join(','),
    subject: `[SoutenancePro] Planification de soutenance - ${student.prenom} ${student.nom}`,
    html: getHtmlTemplate(title, content, 'Voir le Planning', `${process.env.FRONTEND_URL}/dashboard.html#planning`),
  });
};

module.exports = {
  sendStudentRegistrationEmail,
  sendSupervisorAssignmentEmail,
  sendDefenseScheduledEmail,
};
