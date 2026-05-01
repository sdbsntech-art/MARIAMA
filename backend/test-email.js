require('dotenv').config();
const emailService = require('./utils/emailService');

async function testEmail() {
  console.log('--- TEST DE CONFIGURATION SMTP ---');
  console.log(`Utilisateur: ${process.env.SMTP_USER}`);
  console.log(`Serveur: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  
  try {
    const student = {
      prenom: 'Test',
      nom: 'SoutenancePro',
      email: process.env.SMTP_USER, // On s'envoie le mail à soi-même
      filiere: 'DSECG (Test)',
      sujet: 'Vérification de la configuration SMTP'
    };

    console.log('\nEnvoi du mail de test...');
    const info = await emailService.sendStudentRegistrationEmail(student);
    
    console.log('✅ Succès ! Mail envoyé.');
    console.log('ID du message:', info.messageId);
    console.log('\nVérifiez votre boîte de réception (et vos spams au cas où).');
  } catch (error) {
    console.error('\n❌ ÉCHEC de l\'envoi :');
    console.error(error.message);
    if (error.code === 'EAUTH') {
      console.error('Erreur d\'authentification : Vérifiez votre adresse mail et votre mot de passe d\'application.');
    }
  }
}

testEmail();
