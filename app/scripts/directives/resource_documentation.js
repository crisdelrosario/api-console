(function() {
  'use strict';

  function calculateContainerHeight(container, consoleContainer, rect) {
    container.style.top = consoleContainer.scrollTop + rect.top - consoleContainer.offsetTop + 'px';
    container.style.bottom = consoleContainer.scrollTop + rect.bottom + 'px';
    container.style.height = rect.bottom - rect.top + 'px';
  }

  function createPopover(element) {
    var consoleContainer = angular.element(document.body).find('raml-console').parent(),
        resourceList = angular.element(document.getElementById('#raml-console')),
        placeholder = angular.element(element[0].querySelector('.resource-placeholder')),
        container = angular.element(element[0].querySelector('.resource-container')),
        rect;

    return {
      open: function($scope, $resourceEl, resource, method) {
        $scope.resource = resource;

        consoleContainer.css('overflow', 'hidden');
        placeholder.css('height', resourceList.css('height'));
        container.addClass('grow-expansion-animation');

        setTimeout(function() {
          rect = $resourceEl[0].getBoundingClientRect();
          calculateContainerHeight(container[0], consoleContainer[0], rect);

          setTimeout(function() {
            placeholder.addClass('masked');
            container.css('height', consoleContainer[0].clientHeight - 10 + 'px');
            container[0].style.top = consoleContainer[0].scrollTop + 5 + 'px';
            $scope.selectedMethod = method;
            $scope.$digest();
          });
        });
      },

      close: function($scope) {
        calculateContainerHeight(container[0], consoleContainer[0], rect);
        setTimeout(function() {
          placeholder.removeClass('masked');

          setTimeout(function() {
            container.removeClass('grow-expansion-animation');
            consoleContainer.css('overflow', 'auto');

            $scope.$apply('resource = undefined');
            $scope.$apply('selectedMethod = undefined');
          }, 200);
        });
      },
    };
  }

  RAML.Directives.resourceDocumentation = function($rootScope, DataStore) {
    var popover;
    function prepare($scope, $element, $resourceEl, resource, method) {
      DataStore.set(resource.toString() + ':method', method.method);
      popover = createPopover($element);
      popover.open($scope, $resourceEl, resource, method);

      $scope.selectMethod = function(method) {
        DataStore.set(resource.toString() + ':method', method.method);
        $scope.selectedMethod = method;
      };

      $scope.closePopover = function(e) {
        e.preventDefault();

        DataStore.set(resource.toString() + ':method', undefined);
        popover.close($scope);
        popover = undefined;
      };
    }

    function Controller($scope, $element) {
      var receipt;

      $rootScope.$on('console:resource:destroyed', function(event, resource) {
        if ($scope.resource && $scope.resource.toString() === resource.toString()) {
          receipt = setTimeout(function() {
            popover.close($scope);
            popover = undefined;
          }, 100);
        }
      });

      $rootScope.$on('console:resource:rendered', function(event, resource, $resourceEl) {
        var methodName = DataStore.get(resource.toString() + ':method');
        if (methodName) {
          var method = resource.methods.filter(function(method) {
            return method.method === methodName;
          })[0] || resource.methods[0];

          if (method) {
            if (receipt && $scope.resource && $scope.resource.toString() === resource.toString()) {
              clearTimeout(receipt);
              $scope.resource = resource;
              $scope.selectedMethod = method;
            } else {
              prepare($scope, $element, $resourceEl, resource, method);
            }
          }
        }
      });

      $rootScope.$on('console:expand', function(event, resource, method, $resourceEl) {
        prepare($scope, $element, $resourceEl, resource, method);
      });
    }

    return {
      restrict: 'E',
      templateUrl: 'views/resource_documentation.tmpl.html',
      controller: Controller,
      scope: {
        api: '=',
        ramlConsole: '='
      }
    };
  };
})();