/* Connexion au CMS du Black Cat.
   `key` est une clé de LECTURE : elle ne donne accès qu'au contenu publié et peut donc
   figurer dans le code du site. À remplacer par l'URL et la clé de production à la mise en ligne.

   Pour désactiver le CMS et revenir au contenu écrit dans assets/js/data.js :
   mettre `url` à '' (chaîne vide). */
window.SGT_CMS = {
  url: 'http://localhost:3200',
  key: 'sgt_pk_dev_blackcat_local_only'
};
