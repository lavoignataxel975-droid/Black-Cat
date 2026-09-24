/* Connexion au CMS du Black Cat.
   `key` est une clé de LECTURE : elle ne donne accès qu'au contenu publié et peut donc
   figurer dans le code du site. À remplacer par l'URL et la clé de production à la mise en ligne.

   Pour désactiver le CMS et revenir au contenu écrit dans assets/js/data.js :
   mettre `url` à '' (chaîne vide).

   Le CMS local (localhost:3200) n'est appelé que si le site est lui-même ouvert en local.
   En ligne (Vercel…), un navigateur bloque l'accès d'un site public à « localhost » :
   le site affiche alors directement le contenu de data.js. */
var SGT_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
window.SGT_CMS = {
  url: SGT_LOCAL ? 'http://localhost:3200' : '',
  key: 'sgt_pk_dev_blackcat_local_only'
};
